import { Pool, QueryResultRow } from 'pg';
import { ServiceUnavailableError } from '../shared/errors';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Antes lançava um Error genérico, não capturado pelo errorHandler como
    // AppError — qualquer requisição que tocasse o banco virava um 500
    // opaco ("Erro interno do servidor"), mascarando a causa real
    // (variável de ambiente DATABASE_URL não configurada).
    throw new ServiceUnavailableError(
      'Configuração de banco de dados ausente: defina a variável de ambiente DATABASE_URL antes de iniciar o servidor.',
    );
  }

  const isLocalhost = /localhost|127\.0\.0\.1/.test(databaseUrl);
  pool = new Pool({
    connectionString: databaseUrl,
    // Provedores gerenciados (Render, Railway, Supabase etc.) exigem SSL em
    // conexões externas; certificado autoassinado, por isso rejectUnauthorized: false.
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
  });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function querySingle<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(sql, params);
  } finally {
    client.release();
  }
}
