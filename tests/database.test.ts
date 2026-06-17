describe('getPool - configuração ausente', () => {
  const originalEnv = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalEnv;
    }
    jest.resetModules();
  });

  // Antes desta correção, a ausência de DATABASE_URL lançava um Error
  // genérico, tratado pelo errorHandler como 500 "Erro interno do servidor"
  // (causa real escondida). Agora deve lançar ServiceUnavailableError (503)
  // com mensagem explícita.
  test('lança ServiceUnavailableError (503) quando DATABASE_URL não está definida', () => {
    delete process.env.DATABASE_URL;
    jest.resetModules();
    const { getPool } = require('../src/config/database');
    const { ServiceUnavailableError } = require('../src/shared/errors');

    expect(() => getPool()).toThrow(ServiceUnavailableError);
    expect(() => getPool()).toThrow('Configuração de banco de dados ausente');
  });
});
