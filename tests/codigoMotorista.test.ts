import * as service from '../src/modules/vinculo/service';
import * as repo from '../src/modules/vinculo/repository';
import { PerfilUsuario } from '../src/shared/types';

jest.mock('../src/modules/vinculo/repository');

const mockRepo = repo as jest.Mocked<typeof repo>;

const CODIGO_REGEX = /^MTR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

describe('Código único do motorista', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Teste 1: motorista novo -> código é gerado e salvo
  test('motorista novo: código é gerado e salvo no banco', async () => {
    mockRepo.upsertUsuario.mockResolvedValue({
      id: 10,
      nome: 'Novo Motorista',
      tipo: 'motorista',
      codigo: null,
    });
    mockRepo.setCodigoIfMissing.mockImplementation((id, codigo) =>
      Promise.resolve({ id, nome: 'Novo Motorista', tipo: 'motorista', codigo }),
    );

    const codigo = await service.garantirCodigoMotorista(10, 'Novo Motorista');

    expect(codigo).toMatch(CODIGO_REGEX);
    expect(mockRepo.upsertUsuario).toHaveBeenCalledWith(10, 'Novo Motorista', 'motorista');
    expect(mockRepo.setCodigoIfMissing).toHaveBeenCalledTimes(1);
    expect(mockRepo.setCodigoIfMissing).toHaveBeenCalledWith(10, codigo);
  });

  // Teste 2: novo login do mesmo motorista -> mesmo código é retornado, nunca recriado
  test('novo login: mesmo código já persistido é retornado sem gerar outro', async () => {
    mockRepo.upsertUsuario.mockResolvedValue({
      id: 10,
      nome: 'Novo Motorista',
      tipo: 'motorista',
      codigo: 'MTRABC234',
    });

    const codigo = await service.garantirCodigoMotorista(10, 'Novo Motorista');

    expect(codigo).toBe('MTRABC234');
    expect(mockRepo.setCodigoIfMissing).not.toHaveBeenCalled();
  });

  // Teste 3: consulta por código -> motorista é encontrado com o código real
  test('consulta por código: motorista é encontrado com os dados reais', async () => {
    mockRepo.findMotoristaByCode.mockResolvedValue({
      id: 10,
      nome: 'Novo Motorista',
      tipo: 'motorista',
      codigo: 'MTRABC234',
    });

    const result = await service.buscarMotoristaPorCodigo('MTRABC234');

    expect(result).toEqual({ id: 10, nome: 'Novo Motorista', codigo: 'MTRABC234' });
    expect(mockRepo.findMotoristaByCode).toHaveBeenCalledWith('MTRABC234');
  });

  // Teste 4: motorista antigo sem código -> código é criado automaticamente,
  // mesmo havendo uma colisão na primeira tentativa de geração.
  test('motorista antigo sem código: código é criado automaticamente (com retry em colisão)', async () => {
    mockRepo.upsertUsuario.mockResolvedValue({
      id: 20,
      nome: 'Motorista Antigo',
      tipo: 'motorista',
      codigo: null,
    });
    mockRepo.setCodigoIfMissing
      .mockRejectedValueOnce({ code: '23505' })
      .mockImplementationOnce((id, codigo) =>
        Promise.resolve({ id, nome: 'Motorista Antigo', tipo: 'motorista', codigo }),
      );

    const codigo = await service.garantirCodigoMotorista(20, 'Motorista Antigo');

    expect(codigo).toMatch(CODIGO_REGEX);
    expect(mockRepo.setCodigoIfMissing).toHaveBeenCalledTimes(2);
  });

  // Endpoint de perfil: o código real persistido deve ser devolvido ao frontend,
  // nunca um valor de fallback.
  test('perfil do motorista: retorna o código real persistido, sem fallback', async () => {
    mockRepo.findUsuarioById.mockResolvedValue({
      id: 10,
      nome: 'Novo Motorista',
      tipo: 'motorista',
      codigo: 'MTRABC234',
    });

    const result = await service.consultarPerfilMotorista({
      id: 10,
      tipo: PerfilUsuario.MOTORISTA,
      nome: 'Novo Motorista',
    });

    expect(result).toEqual({ id: 10, nome: 'Novo Motorista', codigo: 'MTRABC234' });
    expect(result.codigo).not.toBe('CAMPO_AUSENTE_NA_AUTH_API');
  });

  // MODO TESTE: a checagem de role (exigir motorista) foi comentada — qualquer
  // usuário autenticado deve conseguir consultar o endpoint, sem 403.
  test('perfil: usuário ALUNO autenticado não é bloqueado por role (MODO TESTE)', async () => {
    mockRepo.findUsuarioById.mockResolvedValue({
      id: 1,
      nome: 'Aluno Teste',
      tipo: 'aluno',
      codigo: null,
    });

    const result = await service.consultarPerfilMotorista({
      id: 1,
      tipo: PerfilUsuario.ALUNO,
      nome: 'Aluno Teste',
    });

    expect(result).toEqual({ id: 1, nome: 'Aluno Teste', codigo: null });
  });
});
