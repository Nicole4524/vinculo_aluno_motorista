import request from 'supertest';
import app from '../src/app';
import * as repo from '../src/modules/vinculo/repository';

jest.mock('../src/modules/vinculo/repository');
const mockRepo = repo as jest.Mocked<typeof repo>;

// MODO DESENVOLVIMENTO: estes testes confirmam que nenhum endpoint da API de
// vínculo exige Authorization/Bearer Token enquanto a autenticação estiver
// desabilitada (ver src/middleware/auth.ts).
describe('Acesso público (autenticação desabilitada - MODO DESENVOLVIMENTO)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/vinculo/motoristas/codigo/:codigo funciona sem header Authorization', async () => {
    mockRepo.findMotoristaByCode.mockResolvedValue({
      id: 1,
      nome: 'Motorista Teste',
      tipo: 'motorista',
      codigo: 'MTRABC123',
    });

    const res = await request(app).get('/api/vinculo/motoristas/codigo/MTRABC123');

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, nome: 'Motorista Teste', codigo: 'MTRABC123' });
  });

  test('GET /api/vinculo/motoristas/perfil funciona sem token (identidade via headers de teste)', async () => {
    mockRepo.findUsuarioById.mockResolvedValue({
      id: 5,
      nome: 'Motorista Sem Token',
      tipo: 'motorista',
      codigo: 'MTRXYZ987',
    });

    const res = await request(app)
      .get('/api/vinculo/motoristas/perfil')
      .set('x-user-id', '5')
      .set('x-user-tipo', 'MOTORISTA');

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 5, nome: 'Motorista Sem Token', codigo: 'MTRXYZ987' });
  });

  test('POST /api/vinculo/solicitacoes funciona sem header Authorization', async () => {
    mockRepo.findUsuarioById.mockImplementation((id: number) => {
      if (id === 0) return Promise.resolve({ id: 0, nome: 'Usuário de Teste', tipo: 'aluno', codigo: null });
      if (id === 2) return Promise.resolve({ id: 2, nome: 'Motorista Teste', tipo: 'motorista', codigo: 'MTRABC123' });
      return Promise.resolve(null);
    });
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.findPendenteByPair.mockResolvedValue(null);
    mockRepo.insertSolicitacao.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 0,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: 'PENDENTE' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });

    const res = await request(app)
      .post('/api/vinculo/solicitacoes')
      .send({ targetId: 2 });

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(201);
  });

  test('GET /api/vinculo/solicitacoes/recebidas funciona sem header Authorization', async () => {
    mockRepo.findSolicitacoesByAluno.mockResolvedValue([]);

    const res = await request(app).get('/api/vinculo/solicitacoes/recebidas');

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  test('PATCH /api/vinculo/solicitacoes/:id/responder funciona sem header Authorization', async () => {
    mockRepo.findSolicitacaoById.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 0,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: 'PENDENTE' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: null,
    });
    mockRepo.findVinculoAtivoByAluno.mockResolvedValue(null);
    mockRepo.insertVinculo.mockResolvedValue({
      id: 'v-1',
      aluno_id: 0,
      motorista_id: 2,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockRepo.updateSolicitacaoStatus.mockResolvedValue({
      id: 'sol-1',
      aluno_id: 0,
      motorista_id: 2,
      solicitado_por: 'ALUNO' as any,
      status: 'ACEITA' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    });
    mockRepo.findUsuarioById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/vinculo/solicitacoes/sol-1/responder')
      .set('x-user-id', '2')
      .set('x-user-tipo', 'MOTORISTA')
      .send({ acao: 'ACEITAR' });

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  test('GET /api/vinculo/vinculos/ativos funciona sem header Authorization', async () => {
    mockRepo.listVinculosAtivos.mockResolvedValue([]);

    const res = await request(app).get('/api/vinculo/vinculos/ativos');

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });
});
