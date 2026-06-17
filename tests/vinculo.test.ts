import { DadosUsuario, PerfilUsuario, StatusSolicitacao } from '../src/shared/types';
import * as service from '../src/modules/vinculo/service';
import * as repo from '../src/modules/vinculo/repository';

jest.mock('../src/modules/vinculo/repository');

const mockRepo = repo as jest.Mocked<typeof repo>;

// Filtra por (id, tipo), não só por id: aluno e motorista podem ter o mesmo id
// numérico vindo da Auth API (ver repository.ts), então o mock precisa
// respeitar o tipo pedido para refletir o comportamento real corrigido.
function mockFindUsuario(aluno?: { id: number; nome: string; tipo: string }, motorista?: { id: number; nome: string; tipo: string }) {
  return (id: number, tipo: string) => {
    if (aluno && id === aluno.id && tipo === aluno.tipo) return Promise.resolve(aluno);
    if (motorista && id === motorista.id && tipo === motorista.tipo) return Promise.resolve(motorista);
    return Promise.resolve(null);
  };
}

function makeAlunoUser(id = 1): DadosUsuario {
  return { id, tipo: PerfilUsuario.ALUNO, nome: 'Aluno Teste' };
}

function makeMotoristaUser(id = 2): DadosUsuario {
  return { id, tipo: PerfilUsuario.MOTORISTA, nome: 'Motorista Teste' };
}

// ======================================================
// 1. CRIAÇÃO DE SOLICITAÇÃO
// ======================================================
describe('criarSolicitacao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('aluno solicita motorista com sucesso', async () => {
    const aluno = makeAlunoUser(1);
    const motorista = makeMotoristaUser(2);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.findPendenteByPair.mockResolvedValue(null);
    mockRepo.insertSolicitacao.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    const result = await service.criarSolicitacao(aluno, 2);

    expect(result.status).toBe(StatusSolicitacao.PENDENTE);
    expect(result.alunoId).toBe(1);
    expect(result.motoristaId).toBe(2);
    expect(result.solicitadoPor).toBe('ALUNO');
    expect(mockRepo.insertSolicitacao).toHaveBeenCalledWith(1, 2, 'ALUNO');
  });

  // Regressão: reproduz o bug relatado em produção. O id retornado pela Auth
  // API não é único entre alunos e motoristas (vêm de tabelas/sequências
  // independentes), então um OUTRO aluno qualquer pode ter, por coincidência,
  // o mesmo id numérico de um motorista já cadastrado. Antes da correção,
  // repo.findUsuarioById(targetId) buscava só por id e o upsert do aluno
  // colidente sobrescrevia a linha do motorista (tipo = 'aluno'), fazendo a
  // busca por código (e por consequência qualquer novo vínculo) falhar com
  // "motorista não encontrado" para QUALQUER aluno, mesmo o código nunca
  // tendo mudado no banco.
  test('id do motorista colide com o de outro aluno: solicitação ainda encontra o motorista certo', async () => {
    const idColidente = 2;
    const aluno = makeAlunoUser(1);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        // Linha de um aluno QUALQUER (não o solicitante) que coincidentemente
        // tem o mesmo id numérico do motorista.
        { id: idColidente, nome: 'Outro Aluno Colidente', tipo: 'aluno' },
        { id: idColidente, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.findPendenteByPair.mockResolvedValue(null);
    mockRepo.insertSolicitacao.mockResolvedValue({
      id: 'sol-colisao',
      aluno_id: 1,
      motorista_id: idColidente,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    const result = await service.criarSolicitacao(aluno, idColidente);

    expect(result.status).toBe(StatusSolicitacao.PENDENTE);
    expect(result.motoristaId).toBe(idColidente);
    // A chave da correção: busca o alvo já filtrando por tipo = 'motorista',
    // nunca apenas por id — por isso a linha do aluno colidente é ignorada.
    expect(mockRepo.findUsuarioById).toHaveBeenCalledWith(idColidente, 'motorista');
    expect(mockRepo.insertSolicitacao).toHaveBeenCalledWith(1, idColidente, 'ALUNO');
  });

  test('motorista solicita aluno com sucesso', async () => {
    const motorista = makeMotoristaUser(2);
    const aluno = makeAlunoUser(1);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.findPendenteByPair.mockResolvedValue(null);
    mockRepo.insertSolicitacao.mockResolvedValue({
      id: 'sol-2',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'MOTORISTA' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    const result = await service.criarSolicitacao(motorista, 1);

    expect(result.status).toBe(StatusSolicitacao.PENDENTE);
    expect(result.alunoId).toBe(1);
    expect(result.motoristaId).toBe(2);
    expect(result.solicitadoPor).toBe('MOTORISTA');
    expect(mockRepo.insertSolicitacao).toHaveBeenCalledWith(1, 2, 'MOTORISTA');
  });

  test('lança erro se solicitacao duplicada pendente', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.findPendenteByPair.mockResolvedValue({
      id: 'sol-existente',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    await expect(service.criarSolicitacao(aluno, 2)).rejects.toThrow(
      'Já existe uma solicitação pendente entre aluno e motorista',
    );
  });

  test('lança erro se aluno já tem vinculo ativo', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue({
      id: 'v-1',
      aluno_id: 1,
      motorista_id: 3,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(service.criarSolicitacao(aluno, 2)).rejects.toThrow(
      'Aluno já possui um vínculo ativo',
    );
  });

  test('lança erro se target não existe', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
      ),
    );

    await expect(service.criarSolicitacao(aluno, 999)).rejects.toThrow(
      'Usuário alvo não encontrado(a)',
    );
  });

  test('lança erro se solicitar para si mesmo', async () => {
    const aluno = makeAlunoUser(1);
    await expect(service.criarSolicitacao(aluno, 1)).rejects.toThrow(
      'Não é possível criar solicitação para si mesmo',
    );
  });

  test('lança erro se aluno tenta solicitar outro aluno', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 3, nome: 'Outro Aluno', tipo: 'aluno' },
      ),
    );

    await expect(service.criarSolicitacao(aluno, 3)).rejects.toThrow(
      'Aluno só pode solicitar vínculo com um motorista',
    );
  });

  test('lança erro se motorista tenta solicitar outro motorista', async () => {
    const motorista = makeMotoristaUser(2);

    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
        { id: 4, nome: 'Outro Motorista', tipo: 'motorista' },
      ),
    );

    await expect(service.criarSolicitacao(motorista, 4)).rejects.toThrow(
      'Motorista só pode solicitar vínculo com um aluno',
    );
  });
});

// ======================================================
// 2. ACEITE
// ======================================================
describe('responderSolicitacao - ACEITAR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('aceita e cria vinculo automaticamente', async () => {
    const motorista = makeMotoristaUser(2);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.insertVinculo.mockResolvedValue({
      id: 'v-1',
      aluno_id: 1,
      motorista_id: 2,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockRepo.updateSolicitacaoStatus.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.ACEITA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    });
    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );

    const result = await service.responderSolicitacao(motorista, 'sol-1', 'ACEITAR');

    expect(result.status).toBe(StatusSolicitacao.ACEITA);
    expect(mockRepo.insertVinculo).toHaveBeenCalledWith(1, 2);
  });

  test('bloqueia se aluno já tem vinculo ativo', async () => {
    const motorista = makeMotoristaUser(2);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue({
      id: 'v-existing',
      aluno_id: 1,
      motorista_id: 3,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(service.responderSolicitacao(motorista, 'sol-1', 'ACEITAR')).rejects.toThrow(
      'Aluno já possui um vínculo ativo',
    );
  });

  test('aluno pode aceitar solicitacao feita pelo motorista', async () => {
    const aluno = makeAlunoUser(1);
    const motorista = makeMotoristaUser(2);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'MOTORISTA' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.insertVinculo.mockResolvedValue({
      id: 'v-1',
      aluno_id: 1,
      motorista_id: 2,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockRepo.updateSolicitacaoStatus.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'MOTORISTA' as any,
      status: StatusSolicitacao.ACEITA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    });
    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );

    const result = await service.responderSolicitacao(aluno, 'sol-1', 'ACEITAR');
    expect(result.status).toBe(StatusSolicitacao.ACEITA);
    expect(mockRepo.insertVinculo).toHaveBeenCalledWith(1, 2);
  });
});

// ======================================================
// 3. RECUSA
// ======================================================
describe('responderSolicitacao - RECUSAR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('recusa altera status corretamente', async () => {
    const motorista = makeMotoristaUser(2);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.updateSolicitacaoStatus.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.RECUSADA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    });
    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );

    const result = await service.responderSolicitacao(motorista, 'sol-1', 'RECUSAR');

    expect(result.status).toBe(StatusSolicitacao.RECUSADA);
    expect(mockRepo.insertVinculo).not.toHaveBeenCalled();
  });
});

// ======================================================
// 4. CANCELAMENTO
// ======================================================
describe('cancelarSolicitacao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('solicitante (aluno) pode cancelar', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.updateSolicitacaoStatus.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.CANCELADA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );

    const result = await service.cancelarSolicitacao(aluno, 'sol-1');
    expect(result.status).toBe(StatusSolicitacao.CANCELADA);
  });

  test('solicitante (motorista) pode cancelar', async () => {
    const motorista = makeMotoristaUser(2);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'MOTORISTA' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.updateSolicitacaoStatus.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'MOTORISTA' as any,
      status: StatusSolicitacao.CANCELADA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.findUsuarioById.mockImplementation(
      mockFindUsuario(
        { id: 1, nome: 'Aluno Teste', tipo: 'aluno' },
        { id: 2, nome: 'Motorista Teste', tipo: 'motorista' },
      ),
    );

    const result = await service.cancelarSolicitacao(motorista, 'sol-1');
    expect(result.status).toBe(StatusSolicitacao.CANCELADA);
  });

  test('apenas o solicitante pode cancelar', async () => {
    const outroMotorista = makeMotoristaUser(3);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    await expect(service.cancelarSolicitacao(outroMotorista, 'sol-1')).rejects.toThrow(
      'Apenas o solicitante pode cancelar a solicitação',
    );
  });

  test('aluno não pode cancelar solicitação feita pelo motorista', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'MOTORISTA' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    await expect(service.cancelarSolicitacao(aluno, 'sol-1')).rejects.toThrow(
      'Apenas o solicitante pode cancelar a solicitação',
    );
  });

  test('não pode cancelar solicitação já respondida', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.ACEITA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    });

    await expect(service.cancelarSolicitacao(aluno, 'sol-1')).rejects.toThrow(
      'Solicitação não está mais pendente',
    );
  });
});

// ======================================================
// 5. SEGURANÇA
// ======================================================
describe('Segurança - autorização', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('motorista não pode consultar vinculo de aluno', async () => {
    const motorista = makeMotoristaUser(2);
    await expect(service.consultarVinculoAluno(motorista)).rejects.toThrow(
      'Apenas alunos podem consultar seu vínculo',
    );
  });

  test('aluno não pode listar alunos vinculados', async () => {
    const aluno = makeAlunoUser(1);
    await expect(service.listarAlunosVinculados(aluno)).rejects.toThrow(
      'Apenas motoristas podem listar alunos vinculados',
    );
  });

  test('terceiro não pode encerrar vinculo alheio', async () => {
    const outro = makeAlunoUser(3);

    mockRepo.findVinculoById.mockResolvedValue({
      id: 'v-1',
      aluno_id: 1,
      motorista_id: 2,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(service.encerrarVinculo(outro, 'v-1')).rejects.toThrow(
      'Você não tem permissão para encerrar este vínculo',
    );
  });

  test('terceiro não pode responder solicitação que não é sua', async () => {
    const terceiro = makeAlunoUser(3);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    await expect(service.responderSolicitacao(terceiro, 'sol-1', 'ACEITAR')).rejects.toThrow(
      'Você não tem permissão para responder esta solicitação',
    );
  });

  test('aluno não pode responder solicitação que deveria ser respondida pelo motorista', async () => {
    const aluno = makeAlunoUser(1);

    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 1,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: StatusSolicitacao.PENDENTE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    await expect(service.responderSolicitacao(aluno, 'sol-1', 'ACEITAR')).rejects.toThrow(
      'Você não tem permissão para responder esta solicitação',
    );
  });
});
