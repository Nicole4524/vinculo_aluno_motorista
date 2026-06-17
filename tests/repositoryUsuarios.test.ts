import * as db from '../src/config/database';
import * as repo from '../src/modules/vinculo/repository';

jest.mock('../src/config/database');

const mockDb = db as jest.Mocked<typeof db>;

// Regressão do bug "motorista não encontrado depois do primeiro vínculo":
// alunos e motoristas vêm de sequências de id independentes na Auth API, então
// podem colidir no mesmo id numérico. Estes testes garantem que as queries da
// tabela `usuarios` sempre tratam (id, tipo) como a chave real, nunca id isolado
// — é essa a correção que impede um aluno colidente de sobrescrever/ocultar a
// linha de um motorista.
describe('repository usuarios — chave (id, tipo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('upsertUsuario usa ON CONFLICT (id, tipo), não apenas (id)', async () => {
    mockDb.query.mockResolvedValue([{ id: 7, nome: 'X', tipo: 'motorista', codigo: null }]);

    await repo.upsertUsuario(7, 'X', 'motorista');

    const [sql, params] = mockDb.query.mock.calls[0];
    expect(sql).toMatch(/ON CONFLICT \(id,\s*tipo\)/);
    expect(sql).not.toMatch(/ON CONFLICT \(id\)\s*DO/);
    expect(params).toEqual([7, 'X', 'motorista', null]);
  });

  test('findUsuarioById filtra por id E por tipo', async () => {
    mockDb.querySingle.mockResolvedValue({ id: 7, nome: 'X', tipo: 'motorista', codigo: 'MTRABC123' });

    await repo.findUsuarioById(7, 'motorista');

    const [sql, params] = mockDb.querySingle.mock.calls[0];
    expect(sql).toMatch(/WHERE id = \$1 AND tipo = \$2/);
    expect(params).toEqual([7, 'motorista']);
  });

  test('setCodigoIfMissing só grava código em linha com tipo = motorista', async () => {
    mockDb.query.mockResolvedValue([{ id: 7, nome: 'X', tipo: 'motorista', codigo: 'MTRABC123' }]);

    await repo.setCodigoIfMissing(7, 'MTRABC123');

    const [sql, params] = mockDb.query.mock.calls[0];
    expect(sql).toMatch(/tipo = 'motorista'/);
    expect(params).toEqual([7, 'MTRABC123']);
  });

  test('findMotoristaByCode continua filtrando por tipo = motorista', async () => {
    mockDb.querySingle.mockResolvedValue({ id: 7, nome: 'X', tipo: 'motorista', codigo: 'MTRABC123' });

    await repo.findMotoristaByCode('MTRABC123');

    const [sql, params] = mockDb.querySingle.mock.calls[0];
    expect(sql).toMatch(/WHERE codigo = \$1 AND tipo = \$2/);
    expect(params).toEqual(['MTRABC123', 'motorista']);
  });
});
